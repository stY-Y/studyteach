import type { UserRole } from '@teachstudy/shared';
import { http } from './http';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  name?: string;
  schoolId?: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  username: string;
  password: string;
  role?: UserRole;
  name?: string;
  phone?: string;
  schoolId?: string;
}

export interface HealthResult {
  status: string;
  service: string;
  time: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    http.post<LoginResult>('/auth/login', { username, password }),

  register: (payload: RegisterPayload) => http.post<LoginResult>('/auth/register', payload),

  me: () => http.get<AuthUser>('/auth/me'),

};

/** 后端健康检查（公开接口，用于首页连通性提示） */
export const systemApi = {
  health: () => http.get<HealthResult>('/health', { timeoutMs: 5000 }),
};