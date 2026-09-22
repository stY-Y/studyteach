import { DifficultyLevel, QuestionType } from '@teachstudy/shared';
import { PaperBlueprintItem, PaperGenInput } from './providers/ai-provider.interface';

const QUESTION_TYPES: string[] = Object.values(QuestionType);
const DIFFICULTIES: string[] = Object.values(DifficultyLevel);

/**
 * 归一化 AI 返回的选题计划，保证服务层拿到的一定是「可用计划」：
 *  - 过滤非法条目（知识点为空/不在给定范围、题型或难度非法、题量非正数）
 *  - 计划为空时，按请求知识点与题量均分兜底
 *  - 题量与请求对齐：超额则裁剪，不足则按条目轮转补齐
 */
export function normalizeBlueprint(raw: unknown, input: PaperGenInput): PaperBlueprintItem[] {
  const allowed = input.knowledgePoints ?? [];
  const items: PaperBlueprintItem[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw as Array<Record<string, unknown>>) {
      const knowledgePointId =
        typeof entry?.knowledgePointId === 'string' ? entry.knowledgePointId.trim() : '';
      if (!knowledgePointId) continue;
      if (allowed.length > 0 && !allowed.includes(knowledgePointId)) continue;

      const questionType = QUESTION_TYPES.includes(String(entry?.questionType))
        ? (entry.questionType as QuestionType)
        : QuestionType.SINGLE_CHOICE;

      const difficulty = DIFFICULTIES.includes(String(entry?.difficulty))
        ? (entry.difficulty as DifficultyLevel)
        : input.difficulty;

      const count = Math.floor(Number(entry?.count));
      if (!Number.isFinite(count) || count <= 0) continue;

      items.push({ knowledgePointId, questionType, difficulty, count });
    }
  }

  const blueprint = items.length > 0 ? items : fallbackBlueprint(input);
  return fitToCount(blueprint, input.count);
}

/** AI 未给出可用计划时：按请求知识点均分，题型轮换 */
function fallbackBlueprint(input: PaperGenInput): PaperBlueprintItem[] {
  const kps = input.knowledgePoints.length > 0 ? input.knowledgePoints : ['all'];
  const base = Math.floor(input.count / kps.length);
  const extra = input.count % kps.length;
  const types = [QuestionType.SINGLE_CHOICE, QuestionType.FILL_BLANK, QuestionType.SHORT_ANSWER];

  return kps
    .map((knowledgePointId, i) => ({
      knowledgePointId,
      questionType: types[i % types.length],
      difficulty: input.difficulty,
      count: base + (i < extra ? 1 : 0),
    }))
    .filter((item) => item.count > 0);
}

/**
 * 让计划总题量与请求题量对齐：超额裁剪，不足补齐。
 * 说明：补齐只是让计划贴合教师请求，实际题目仍由题库决定，
 *       若题库题量不足，组卷服务会在 meta.shortages 中记录缺口。
 */
function fitToCount(blueprint: PaperBlueprintItem[], target: number): PaperBlueprintItem[] {
  const result: PaperBlueprintItem[] = [];
  let remaining = target;

  for (const item of blueprint) {
    if (remaining <= 0) break;
    const take = Math.min(item.count, remaining);
    result.push({ ...item, count: take });
    remaining -= take;
  }

  if (remaining > 0 && result.length > 0) {
    let i = 0;
    while (remaining > 0) {
      const slot = result[i % result.length];
      slot.count += 1;
      remaining -= 1;
      i += 1;
    }
  }

  return result;
}