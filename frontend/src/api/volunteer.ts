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

/** 院校库条目（每年同步投档线与选科要求） */
export interface CollegeItem {
  id: string;
  name: string;
  region?: string | null;
  type?: string | null;
  majors?: string[] | null;
  /** 最低录取位次（参考） */
  minRank?: number | null;
  /** 报考限制 */
  requirements?: string[] | null;
  year: number;
}

export const volunteerApi = {
  /** 按分数/位次/选科生成「冲稳保」方案（标注报考限制） */
  match: (body: MatchVolunteerBody) => http.post<VolunteerPlanItem>('/volunteer/match', body),

  /** 我的志愿方案 */
  plans: () => http.get<VolunteerPlanItem[]>('/volunteer/plans', { cache: true }),

  /** 删除本人的志愿方案 */
  removePlan: (id: string) => http.del<{ deleted: true }>(`/volunteer/plans/${id}`),

  /** 院校库（按年份；每年同步更新投档线/选科要求） */
  colleges: (year?: number) =>
    http.get<CollegeItem[]>('/volunteer/colleges', {
      query: year ? { year } : undefined,
      cache: true,
    }),
};
