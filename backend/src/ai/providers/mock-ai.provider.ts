import { Injectable } from '@nestjs/common';
import { DifficultyLevel, QuestionType, VolunteerTier } from '@teachstudy/shared';
import { normalizeBlueprint } from '../paper-blueprint.util';
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

/**
 * Mock AI 提供方：返回确定性占位结果，保证框架可运行。
 * 接入真实模型时，新建实现类并注册到 AiService 即可，业务层无需改动。
 */
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

  async grade(input: GradeInput): Promise<GradeResult> {
    const correct = input.answer.trim() === input.question.answer.trim();
    return {
      score: correct ? 1 : 0,
      errorAnalysis: correct
        ? '作答正确，可进入下一知识点巩固。'
        : '关键步骤出错，建议回到对应知识点的典型例题（占位分析）。',
      hints: ['先定位题目考查的知识点；回顾定义与解题步骤，不要直接查看答案。'],
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