import type {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { http } from './http';

/**
 * 题库中的题目（学生练习视角）。
 * 后端 GET /questions 返回完整实体（含答案/解析），
 * 但学生端界面一律不渲染 answer / analysis —— 批改只给错因与点拨。
 */
export interface BankQuestion {
  id: string;
  subject: Subject;
  stage: StudyStage;
  /** 年级 1-12（题库第 1 层） */
  grade?: number | null;
  /** 章节（题库第 3 层） */
  chapter?: string | null;
  type: QuestionType;
  difficulty: DifficultyLevel;
  ability?: string | null;
  knowledgePoints: string[];
  content: string;
  options?: string[] | null;
  typicalErrors?: string[] | null;
}

export interface QuestionSearchResult {
  list: BankQuestion[];
  total: number;
  page: number;
  pageSize: number;
}

/** 检索参数（type 别名以获得隐式索引签名，可直接传给 http 层的 query） */
export type QuestionSearchParams = {
  subject?: Subject;
  stage?: StudyStage;
  /** 年级（题库第 1 层） */
  grade?: number;
  /** 章节（题库第 3 层） */
  chapter?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  page?: number;
  pageSize?: number;
};

/** 章节（题库第 3 层） */
export interface ChapterItem {
  chapter: string;
  count: number;
}

/** 录入题目的请求体（教师 / 管理员） */
export type CreateQuestionBody = {
  subject: Subject;
  stage: StudyStage;
  grade?: number;
  chapter?: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  ability: AbilityRequirement;
  knowledgePoints: string[];
  content: string;
  options?: string[];
  answer?: string;
  analysis?: string;
  typicalErrors?: string[];
  source?: string;
};

export const questionsApi = {
  /** 题目检索（approved 状态才可练），结果可离线缓存 */
  search: (params: QuestionSearchParams) =>
    http.get<QuestionSearchResult>('/questions', { query: params, cache: true }),

  /** 章节列表（题库第 3 层，按年级/科目筛选） */
  chapters: (params: { grade?: number; subject?: Subject }) =>
    http.get<ChapterItem[]>('/questions/chapters', {
      query: { grade: params.grade, subject: params.subject },
    }),

  /** 录入题目（教师 / 管理员） */
  create: (body: CreateQuestionBody) => http.post<BankQuestion>('/questions', body),
};
