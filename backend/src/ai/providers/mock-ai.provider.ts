import { Injectable } from '@nestjs/common';
import { DifficultyLevel, QuestionType, VolunteerTier } from '@teachstudy/shared';
import { normalizeBlueprint } from '../paper-blueprint.util';
import {
  AiProvider,
  DiagnoseInput,
  DiagnoseResult,
  GradeInput,
  GradeKeyPoint,
  GradeResult,
  PaperGenInput,
  PaperGenResult,
  VolunteerInput,
  VolunteerResult,
} from './ai-provider.interface';

/**
 * Mock AI 提供方：返回确定性占位结果，保证框架可运行。
 * 接入真实模型时，新建实现类并注册到 AiService 即可，业务层无需改动。
 */
/**
 * Mock 的脚手架内容。
 *
 * 没有模型也要能演示完整的「逐层给提示」体验：
 * 每个学生每道题，先给思路，学生说不会再给一小段答案，再不会再来一句点拨，
 * 直到最后才是完整答案与解析。真实模型接入后，由 PROMPTS.GRADE 产出同样结构。
 */
function buildMockKeyPoints(input: GradeInput): GradeKeyPoint[] {
  const ref = String(input.question.answer ?? '').trim();
  const stem = String(input.question.content ?? '').split(/[。？!！\n]/)[0]?.trim() ?? '';
  const topic = stem ? `「${stem.slice(0, 24)}${stem.length > 24 ? '…' : ''}」` : '这道题';

  // 答案切成前后两段：先按句读切（读起来自然），切不动再按字数均分
  const parts = ref
    .split(/[,，;；。.!！?？]/)
    .map((s) => s.trim())
    .filter(Boolean);
  let head = '';
  let tail = '';
  if (parts.length >= 2) {
    const half = Math.max(1, Math.ceil(parts.length / 2));
    head = parts.slice(0, half).join('，');
    tail = parts.slice(half).join('，');
  } else {
    const chars = Array.from(ref);
    const mid = Math.max(1, Math.round(chars.length * 0.5));
    head = chars.slice(0, mid).join('');
    tail = chars.slice(mid).join('');
  }

  return [
    {
      title: '第 1 步：找准要用的知识点',
      levels: [
        {
          kind: 'hint',
          content: `先读题${topic}：它考的是哪个知识点？把定义或公式先写在草稿纸上，再往下看。`,
        },
        {
          kind: 'partial',
          content: ref
            ? `参考答案的关键一步是：「${head}」——先只看这一句，自己试着把剩下半句补出来。`
            : '先把题目给的条件列出来，看看哪两个条件之间存在关系。',
        },
        {
          kind: 'hint',
          content: '把自己写的这一步和上面这句对照：缺的是公式、符号，还是条件没用上？',
        },
        {
          kind: 'partial',
          content: tail
            ? `再给你后半步：「${tail}」。现在合起来想一想，为什么会是这个结果？`
            : '把式子整理到最简，看看能不能得到题目要求的量。',
        },
      ],
    },
    {
      title: '第 2 步：把过程写完整',
      levels: [
        {
          kind: 'hint',
          content: '按上一步确定的方法，把过程一步一步写出来，每一步都注明用了什么性质或公式。',
        },
        {
          kind: 'partial',
          content: ref
            ? `这一步的结果指向「${Array.from(tail || ref).slice(-8).join('')}」附近，检查一下你的中间结果。`
            : '检查中间结果是否还在合理范围内（比如人数、长度不可能是负数）。',
        },
        {
          kind: 'hint',
          content: '还差一点：回头看看有没有漏掉单位换算、正负号、约分或分类讨论。',
        },
        {
          kind: 'partial',
          content: '实在想不出来也没关系——下面「参考答案」那一层就是完整答案，看懂后再遮住重做一遍。',
        },
      ],
    },
  ];
}

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async diagnose(input: DiagnoseInput): Promise<DiagnoseResult> {
    const weakPoints = input.knowledgePoints.slice(0, 3).map((kp, i) => ({
      knowledgePointId: kp,
      mastery: Math.max(0.2, 0.85 - i * 0.3),
      reason: '检测题正确率偏低，存在概念混淆（占位分析，接入模型后替换）',
    }));
    const learningPath = weakPoints.map((wp) => `先复习「${wp.knowledgePointId}」基础概念，再练习同类题`);
    return { weakPoints, learningPath };
  }

  /**
   * 批改：给出「关键点 + 逐层揭示」的脚手架。
   *
   * 每个关键点的层级按 点拨 → 一部分答案 → 再点拨 → 再多一点答案 递进，
   * 学生点一次展开一层，实在不会再给完整答案与解析。
   */
  async grade(input: GradeInput): Promise<GradeResult> {
    const correct = input.answer.trim() === input.question.answer.trim();
    const keyPoints = buildMockKeyPoints(input);
    return {
      score: correct ? 1 : 0,
      errorAnalysis: correct
        ? '作答正确，可进入下一知识点巩固。'
        : '关键步骤出错：把自己写的第一步和参考答案的做法对照一下，看看从哪一步开始偏了（占位分析，接入模型后替换为真实诊断）。',
      hints: keyPoints.map((kp) => kp.levels[0]?.content ?? '').filter(Boolean),
      keyPoints,
      answer: input.question.answer,
      analysis: correct
        ? '你的作答与参考答案一致，思路清晰。可以尝试换一种解法，或做一道更难的同类题巩固。'
        : '先按上面的关键点逐层推进：定位考点 → 写出关键一步 → 完成计算。每一步都对着自己原来的作答改一遍，比直接抄答案记得牢（占位解析）。',
    };
  }

  /** 组卷：输出选题计划（题型轮换、难度梯度），由服务层从题库真实抽题 */
  async generatePaper(input: PaperGenInput): Promise<PaperGenResult> {
    const kps = input.knowledgePoints.length > 0 ? input.knowledgePoints : ['all'];
    const types = [QuestionType.SINGLE_CHOICE, QuestionType.FILL_BLANK, QuestionType.SHORT_ANSWER];
    const difficulties = [DifficultyLevel.EASY, input.difficulty, DifficultyLevel.HARD];
    const perKp = Math.max(1, Math.round(input.count / kps.length));

    const raw = kps.map((kp, i) => ({
      knowledgePointId: kp,
      questionType: types[i % types.length],
      difficulty: difficulties[i % difficulties.length],
      count: perKp,
    }));

    return {
      blueprint: normalizeBlueprint(raw, input),
      summary: `已按「${input.stage}·${input.subject}·${input.difficulty}」生成 ${input.count} 题的选题计划（本地占位）`,
    };
  }

  async matchVolunteer(input: VolunteerInput): Promise<VolunteerResult> {
    const plans = [
      { name: '冲刺院校A（占位）', tier: VolunteerTier.CHONG, restrictions: ['选科要求：物理+化学', '单科成绩限制'] },
      { name: '稳妥院校B（占位）', tier: VolunteerTier.WEN, restrictions: ['体检要求：无色盲'] },
      { name: '保底院校C（占位）', tier: VolunteerTier.BAO, restrictions: [] },
    ];
    return { plans };
  }

  async extractKnowledgeTags(_title: string, _content: string): Promise<string[]> {
    return ['kp_placeholder_1', 'kp_placeholder_2'];
  }
}