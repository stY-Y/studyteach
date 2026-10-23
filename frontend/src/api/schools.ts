import { http } from './http';

/** 学校（资源「仅本校可见」、教师限本校审核都依赖它） */
export interface SchoolItem {
  id: string;
  name: string;
  region?: string | null;
  type?: string | null;
  createdAt: string;
}

export const schoolsApi = {
  /** 学校列表（登录用户均可查看，可离线缓存） */
  list: () => http.get<SchoolItem[]>('/schools', { cache: true }),
};
