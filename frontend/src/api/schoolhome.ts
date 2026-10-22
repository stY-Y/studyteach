import { http } from './http';

/** 家校绑定后，家长可见的孩子学情进度汇总 */
export interface ChildProgress {
  student: { id?: string; name?: string; username?: string };
  diagnosisCount: number;
  gradingCount: number;
  latestWeakPoints: Array<{ knowledgePointId: string; mastery: number; reason?: string }>;
  latestLearningPath: string[];
  updatedAt: string | null;
}

export const schoolHomeApi = {
  /** 已绑定孩子的学情进度（可离线查看，外出务工家长随时可看） */
  childrenProgress: () => http.get<ChildProgress[]>('/school-home/children-progress', { cache: true }),
};
