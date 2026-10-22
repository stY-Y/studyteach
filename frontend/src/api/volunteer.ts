import { http } from './http';

/** 冲 / 稳 / 保 一所院校的推荐 */
export interface VolunteerCollege {
  name: string;
  tier: string;
  restrictions: string[];
}

export interface VolunteerPlanItem {
  id: string;
  studentId: string;
  score: number;
  rank: number;
  subjects: string[];
  plans: VolunteerCollege[];
  createdAt: string;
}

export type MatchVolunteerBody = {
  score: number;
  rank: number;
  subjects: string[];
};

export const volunteerApi = {
  /** 按分数/位次/选科生成「冲稳保」方案（标注报考限制） */
  match: (body: MatchVolunteerBody) => http.post<VolunteerPlanItem>('/volunteer/match', body),

  /** 我的志愿方案 */
  plans: () => http.get<VolunteerPlanItem[]>('/volunteer/plans', { cache: true }),
};
