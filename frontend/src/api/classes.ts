import { http } from './http';

/** 班级摘要：学校 + 年级 + 班级名 唯一确定一个班 */
export interface ClassSummary {
  schoolId: string;
  grade: string;
  className: string;
  studentCount: number;
}

export const classesApi = {
  /** 班级列表（按学校过滤；不传则返回全部） */
  list: (schoolId?: string) => http.get<ClassSummary[]>('/classes', { query: { schoolId } }),
};
