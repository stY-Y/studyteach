import type { QuestionType, StudyStage, Subject } from '@teachstudy/shared';
import { http } from './http';

/** 诊断用题目（学生端不返回答案与解析） */
export interface DiagnosisQuestion {
  id: string;
  subject: Subject;
  stage: string;
  type: QuestionType;
  difficulty: string;
  ability: string;
  knowledgePoints: string[];
  content: string;
  options?: string[] | null;
  typicalErrors?: string[] | null;
}

export interface StartDiagnosisResult {
  recordId: string;
  count: number;
  questions: DiagnosisQuestion[];
}

/** 薄弱点 */
export interface WeakPoint {
  knowledgePointId: string;
  /** 掌握度 0-1 */
  mastery: number;
  reason: string;
}

/** 逐题解析条目（提交后由后端返回） */
export interface ReviewItem {
  questionId: string;
  type: string;
  difficulty: string;
  content: string;
  options: string[] | null;
  knowledgePoints: string[];
  /** 学生作答 */
  studentAnswer: string;
  /** 正确答案 */
  correctAnswer: string;
  isCorrect: boolean;
  /** 解析 */
  analysis: string;
  /** 典型错因 */
  typicalErrors: string[];
}

/** 本次诊断统计 */
export interface DiagnosisStats {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  /** 正确率 0-1 */
  accuracy: number;
}

export interface SubmitDiagnosisResult {
  recordId: string;
  stats: DiagnosisStats;
  weakPoints: WeakPoint[];
  learningPath: string[];
  /** 逐题解析：作答后才下发答案与解析 */
  review: ReviewItem[];
}

export interface DiagnosisRecord {
  id: string;
  studentId: string;
  subject: Subject;
  stage?: StudyStage | null;
  answers?: Array<{ questionId: string; answer: string }> | null;
  coverage: string[] | null;
  questionIds: string[];
  status: string;
  weakPoints: WeakPoint[] | null;
  learningPath: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerItem {
  questionId: string;
  answer: string;
}

export const diagnosisApi = {
  /** 开始诊断：抽 10-15 道检测题（必须指定学段，避免跨学段混题） */
  start: (subject: Subject, stage: StudyStage, knowledgePoints?: string[]) =>
    http.post<StartDiagnosisResult>('/diagnosis/start', { subject, stage, knowledgePoints }),

  /** 提交作答：10 秒内返回薄弱点与补漏路径 */
  submit: (recordId: string, answers: AnswerItem[]) =>
    http.post<SubmitDiagnosisResult>(`/diagnosis/${recordId}/submit`, { answers }),

  /** 我的诊断记录（可离线查看历史） */
  list: () => http.get<DiagnosisRecord[]>('/diagnosis', { cache: true }),

  /** 诊断详情（含逐题解析，仅本人可看） */
  detail: (id: string) =>
    http.get<DiagnosisRecord & { stats: DiagnosisStats; review: ReviewItem[] }>(`/diagnosis/${id}`, {
      cache: true,
    }),
};