import type { Subject } from '@teachstudy/shared';
import { http } from './http';

/** 极简报表指标：后端以 Record<string, unknown> 落库，前端按需取字段 */
export interface ReportMetrics {
  diagnosisCount?: number;
  gradingCount?: number;
  weakPointCount?: number;
  /** 平均得分 0-1 */
  avgScore?: number;
  weakPoints?: Array<{ id: string; mastery: number }>;
}

export interface StudyReportItem {
  id: string;
  studentId: string;
  subject: Subject;
  metrics: ReportMetrics;
  createdAt: string;
}

export const reportsApi = {
  /** 生成极简版学情报表（按学科汇总诊断与批改数据） */
  generate: (subject: Subject) => http.post<StudyReportItem>('/reports/generate', { subject }),

  /** 我的报表历史（可离线查看） */
  mine: () => http.get<StudyReportItem[]>('/reports/mine', { cache: true }),

  /** 查看某个学生的报表（教师 / 管理员 / 家长） */
  student: (studentId: string) =>
    http.get<StudyReportItem[]>(`/reports/student/${studentId}`, { cache: true }),
};
