import { http } from './http';

/** 一次批改的结果：得分 + 错因分析 + 启发式点拨（不含完整答案） */
export interface GradeResult {
  recordId: string;
  questionId: string;
  knowledgePointId?: string | null;
  /** 归一化得分 0-1 */
  score: number;
  errorAnalysis: string;
  hints: string[];
}

/** 历史批改记录 */
export interface GradingRecord {
  id: string;
  studentId: string;
  questionId: string;
  answer: string;
  /** 归一化得分 0-1 */
  score: number;
  errorAnalysis?: string | null;
  hints?: string[] | null;
  createdAt: string;
}

export const gradingApi = {
  /** 提交作答，AI 批改主客观题 */
  grade: (questionId: string, answer: string) =>
    http.post<GradeResult>('/grading', { questionId, answer }),

  /** 我的批改记录（可离线查看） */
  list: () => http.get<GradingRecord[]>('/grading', { cache: true }),
};
