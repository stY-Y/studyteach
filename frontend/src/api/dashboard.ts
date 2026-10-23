import { http } from './http';

/** 各角色看板字段不同，统一用宽松结构 */
export type DashboardData = Record<string, number | string>;

export const dashboardApi = {
  overview: () => http.get<DashboardData>('/dashboard/overview'),
};
