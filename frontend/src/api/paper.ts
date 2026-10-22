import type { DifficultyLevel, QuestionType, StudyStage, Subject } from '@teachstudy/shared';
import { http } from './http';

/** AI 选题计划的一项 */
export interface PaperBlueprintItem {
  knowledgePointId: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
}

/** 组卷结果统计（题库不足时如实记录缺口） */
export interface PaperMeta {
  requested: number;
  actual: number;
  shortages: Array<{ knowledgePointId: string; requested: number; actual: number }>;
}

export interface PaperItem {
  id: string;
  title: string;
  subject: Subject;
  stage?: StudyStage | null;
  knowledgePoints: string[];
  difficulty: DifficultyLevel;
  count: number;
  questionIds: string[];
  blueprint?: PaperBlueprintItem[] | null;
  summary?: string | null;
  meta?: PaperMeta | null;
  creatorId: string;
  status: string;
  createdAt: string;
}

/** 试卷中的真实题目（组卷结果的展示形态） */
export interface PaperQuestion {
  id: string;
  subject: Subject;
  stage: StudyStage;
  type: QuestionType;
  difficulty: DifficultyLevel;
  content: string;
  options?: string[] | null;
  answer?: string | null;
  analysis?: string | null;
  knowledgePoints: string[];
}

export interface PaperDetail extends PaperItem {
  questions: PaperQuestion[];
}

export type GeneratePaperBody = {
  title: string;
  subject: Subject;
  stage: StudyStage;
  knowledgePoints: string[];
  difficulty: DifficultyLevel;
  count: number;
};

export const paperApi = {
  /** AI 出选题计划 + 从题库抽真题，生成试卷 */
  generate: (body: GeneratePaperBody) => http.post<PaperDetail>('/papers/generate', body),

  /** 我生成的试卷 */
  mine: () => http.get<PaperItem[]>('/papers', { cache: true }),

  /** 试卷详情（含真实题目） */
  detail: (id: string) => http.get<PaperDetail>(`/papers/${id}`, { cache: true }),
};
