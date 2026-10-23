import { http } from './http';

/** 趋势上的一个点：某天有多少人登录 */
export interface ActivityPoint {
  date: string;
  label: string;
  count: number;
}

/** 日活统计：以「登录」为口径，按自然日去重统计人数 */
export interface ActivityStat {
  today: number;
  yesterday: number;
  peak: number;
  trend: ActivityPoint[];
}

/** 各角色看板字段不同，统一用宽松结构 */
export type DashboardData = {
  role?: string;
  generatedAt?: string;
  /** 仅管理端返回（平台/学校/年级/班级管理员） */
  activity?: ActivityStat | null;
} & Record<string, unknown>;

export const dashboardApi = {
  overview: () => http.get<DashboardData>('/dashboard/overview'),
};
