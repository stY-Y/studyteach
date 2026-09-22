import type { UserRole } from '@teachstudy/shared';
import { http } from './http';

export interface StudentProfile {
  id: string;
  userId: string;
  schoolId?: string | null;
  grade?: string | null;
  className?: string | null;
  subjects?: string[] | null;
  guardianPhone?: string | null;
}

/** GET /users/me 返回用户信息并附带对应角色档案 */
export interface MeResult {
  id: string;
  username: string;
  role: UserRole;
  name?: string;
  schoolId?: string;
  studentProfile?: StudentProfile | null;
  teacherProfile?: unknown;
}

export const usersApi = {
  /** 当前用户（含学生档案），可离线缓存 */
  me: () => http.get<MeResult>('/users/me', { cache: true }),
};
