import { http } from './http';

/** 逐层揭示的一层：hint=点拨 / partial=一部分答案 / answer=完整答案 / analysis=解析 */
export interface GradeHintLevel {
  kind: 'hint' | 'partial' | 'answer' | 'analysis';
  content: string;
}

/** 一个解题关键点，内含逐级递进的提示（要一次给一步） */
export interface GradeKeyPoint {
  title: string;
  levels: GradeHintLevel[];
}

/** 一次批改的结果：得分 + 错因分析 + 关键点脚手架 + 兜底的完整答案与解析 */
export interface GradeResult {
  recordId: string;
  questionId: string;
  knowledgePointId?: string | null;
  /** 归一化得分 0-1 */
  score: number;
  errorAnalysis: string;
  /** 兼容旧结构：每个关键点的第一句点拨 */
  hints: string[];
  /** 关键点（逐层揭示） */
  keyPoints: GradeKeyPoint[];
  /** 完整答案（学生要到底才展示） */
  answer: string;
  /** 完整解析（学生要到底才展示） */
  analysis: string;
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
  keyPoints?: GradeKeyPoint[] | null;
  fullAnswer?: string | null;
  analysis?: string | null;
  createdAt: string;
}

export const gradingApi = {
  /** 提交作答，AI 批改主客观题 */
  grade: (questionId: string, answer: string) =>
    http.post<GradeResult>('/grading', { questionId, answer }),

  /** 我的批改记录（可离线查看） */
  list: () => http.get<GradingRecord[]>('/grading', { cache: true }),
};
