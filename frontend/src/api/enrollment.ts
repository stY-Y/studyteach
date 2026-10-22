import { http } from './http';

/** 升学数据：招生政策 / 投档线 / 选科要求（每年更新） */
export interface EnrollmentItem {
  id: string;
  year: number;
  region?: string | null;
  /** policy / score_line / subject_requirement */
  category: string;
  title: string;
  content: string;
  createdAt: string;
}

export type UpsertEnrollmentBody = {
  year: number;
  region?: string;
  category: 'policy' | 'score_line' | 'subject_requirement';
  title: string;
  content: string;
};

export const enrollmentApi = {
  list: (query?: { year?: number; category?: string }) =>
    http.get<EnrollmentItem[]>('/enrollment', { query, cache: true }),

  upsert: (body: UpsertEnrollmentBody) => http.post<EnrollmentItem>('/enrollment', body),
};
