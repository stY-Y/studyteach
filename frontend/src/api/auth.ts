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

/** 手机验证码发送结果（devCode 仅开发环境返回，便于联调） */
export interface SendCodeResult {
  cooldownSeconds: number;
  devCode: string | null;
}

/** 手机号注册入参 */
export interface PhoneRegisterPayload {
  phone: string;
  code: string;
  password: string;
  name?: string;
  role?: UserRole;
  /** 学生注册必填：学校 / 年级 / 班级 */
  schoolId?: string;
  grade?: string;
  className?: string;
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

  /** 手机号 + 密码登录 */
  loginByPhone: (phone: string, password: string) =>
    http.post<LoginResult>('/auth/login-phone', { phone, password }),

  /** 发送短信验证码（60 秒冷却） */
  sendSmsCode: (phone: string) => http.post<SendCodeResult>('/auth/sms/send', { phone }),

  /** 手机号注册（验证码 + 强密码） */
  registerByPhone: (payload: PhoneRegisterPayload) =>
    http.post<LoginResult>('/auth/register-phone', payload),

  /** 换绑手机号（新手机号验证码校验） */
  changePhone: (phone: string, code: string) =>
    http.patch<{ updated: true }>('/auth/phone', { phone, code }),

  me: () => http.get<AuthUser>('/auth/me'),

};

/** 后端健康检查（公开接口，用于首页连通性提示） */
export const systemApi = {
  health: () => http.get<HealthResult>('/health', { timeoutMs: 5000 }),
};