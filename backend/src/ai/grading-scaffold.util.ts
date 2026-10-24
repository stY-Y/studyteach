import {
  GradeHintLevel,
  GradeKeyPoint,
  GradeResult,
} from './providers/ai-provider.interface';

/**
 * 渐进式脚手架（grading scaffold）的规整逻辑。
 *
 * 模型输出经常缺字段、多包裹一层、kind 拼错，这里统一收口：
 * 保证每个关键点至少有一层提示、层级顺序始终是「点拨 → 部分答案 → 再点拨 → 再多一点答案」，
 * 并且一定能补齐「完整答案 / 完整解析」这两个最终关卡——学生要到底，就得给得出。
 */

const VALID_KINDS: GradeHintLevel['kind'][] = ['hint', 'partial', 'answer', 'analysis'];

/** 模型没标 kind 时按位置兜底：第 1、3、5… 层是点拨，第 2、4、6… 层给一部分答案 */
function guessKind(index: number): GradeHintLevel['kind'] {
  return index % 2 === 0 ? 'hint' : 'partial';
}

function normalizeLevel(raw: unknown, index: number): GradeHintLevel | null {
  if (typeof raw === 'string') {
    const content = raw.trim();
    return content ? { kind: guessKind(index), content } : null;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as { kind?: unknown; content?: unknown; text?: unknown; hint?: unknown };
    const content = String(o.content ?? o.text ?? o.hint ?? '').trim();
    if (!content) return null;
    const kind = VALID_KINDS.indexOf(o.kind as GradeHintLevel['kind']) >= 0
      ? (o.kind as GradeHintLevel['kind'])
      : guessKind(index);
    return { kind, content };
  }
  return null;
}

/** 把任意写法的模型输出整理成关键点数组（空内容直接丢弃） */
export function normalizeKeyPoints(raw: unknown): GradeKeyPoint[] {
  const list = Array.isArray(raw) ? raw : [];
  const points: GradeKeyPoint[] = [];
  list.forEach((item) => {
    const o = (item && typeof item === 'object' ? item : {}) as {
      title?: unknown;
      levels?: unknown;
      hints?: unknown;
    };
    const rawLevels = Array.isArray(o.levels)
      ? o.levels
      : Array.isArray(o.hints)
        ? o.hints
        : [];
    const levels = rawLevels
      .map((lv, i) => normalizeLevel(lv, i))
      .filter((lv): lv is GradeHintLevel => lv !== null);
    if (!levels.length) return;
    const title = String(o.title ?? '').trim() || `第 ${points.length + 1} 步`;
    points.push({ title, levels });
  });
  return points;
}

export interface NormalizeGradeCtx {
  /** 题库参考答案：模型没给 fullAnswer 时拿它兜底 */
  answer?: string;
}

/** 整理一次批改结果：分数、错因、关键点层级、完整答案与解析 */
export function normalizeGrade(
  raw: {
    score?: unknown;
    errorAnalysis?: unknown;
    hints?: unknown;
    keyPoints?: unknown;
    answer?: unknown;
    analysis?: unknown;
  },
  ctx: NormalizeGradeCtx = {},
): GradeResult {
  const num = Number(raw.score);
  const score = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0;
  const errorAnalysis = String(raw.errorAnalysis ?? '').trim();
  const answer = String(raw.answer ?? ctx.answer ?? '').trim();
  const analysis = String(raw.analysis ?? '').trim();

  let keyPoints = normalizeKeyPoints(raw.keyPoints);

  // 模型只给了平铺 hints（旧写法）：每条点拨当一个关键点
  if (!keyPoints.length) {
    const hints = Array.isArray(raw.hints)
      ? raw.hints.map((h) => String(h).trim()).filter(Boolean)
      : [];
    keyPoints = hints.map((h, i) => ({
      title: `第 ${i + 1} 步`,
      levels: [{ kind: 'hint' as const, content: h }],
    }));
  }

  // 最终关卡：学生一层层要到底，就能拿到答案与解析
  if (answer) {
    keyPoints.push({ title: '参考答案', levels: [{ kind: 'answer', content: answer }] });
  }
  if (analysis) {
    keyPoints.push({ title: '完整解析', levels: [{ kind: 'analysis', content: analysis }] });
  }
  if (!keyPoints.length) {
    keyPoints = [
      {
        title: '思路点拨',
        levels: [
          { kind: 'hint', content: '先回到题目考查的知识点，回顾定义与例题，再试着往下写一步。' },
        ],
      },
    ];
  }

  // 兼容旧字段：只收「点拨」，不把答案混进去
  const hints = keyPoints
    .filter((p) => p.levels[0]?.kind !== 'answer' && p.levels[0]?.kind !== 'analysis')
    .map((p) => p.levels.find((l) => l.kind === 'hint')?.content ?? p.levels[0]?.content ?? '')
    .filter(Boolean);

  return { score, errorAnalysis, hints, keyPoints, answer, analysis };
}
