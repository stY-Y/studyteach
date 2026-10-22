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

/** 用户列表项（管理员） */
export interface UserItem {
  id: string;
  username: string;
  role: UserRole;
  name?: string | null;
  phone?: string | null;
  schoolId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 家校绑定关系 */
export interface ParentLink {
  id?: string;
  parentUserId: string;
  studentUserId: string;
  status: string;
  createdAt?: string;
}

export type CreateUserBody = {
  username: string;
  password: string;
  role?: UserRole;
  name?: string;
  phone?: string;
  schoolId?: string;
};

export const usersApi = {
  /** 当前用户（含学生档案），可离线缓存 */
  me: () => http.get<MeResult>('/users/me', { cache: true }),

  /** 管理员：用户列表（后端返回 [列表, 总数]） */
  list: (page = 1, pageSize = 20) =>
    http.get<[UserItem[], number]>('/users', { query: { page, pageSize } }),

  /** 管理员：创建用户 */
  create: (body: CreateUserBody) => http.post<UserItem>('/users', body),

  /** 家长：绑定学生（学生账号） */
  linkChild: (studentUsername: string) =>
    http.post<ParentLink>('/users/parent/link', { studentUsername }),

  /** 家长：已绑定的孩子 */
  children: () => http.get<ParentLink[]>('/users/parent/children', { cache: true }),
};
