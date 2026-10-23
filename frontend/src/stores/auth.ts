import { defineStore } from 'pinia';
import { authApi, type AuthUser, type PhoneRegisterPayload } from '../api/auth';
import { clearToken, getToken, setToken } from '../api/http';
import { ROLE_CONFIG } from '../config/modules';
import { storage } from '../utils/storage';

interface AuthState {
  token: string;
  user: AuthUser | null;
  loading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    user: storage.get<AuthUser>('user'),
    loading: false,
  }),

  getters: {
    isLoggedIn: (s): boolean => Boolean(s.token && s.user),
    roleLabel: (s): string => (s.user ? ROLE_CONFIG[s.user.role]?.label ?? '' : ''),
    displayName: (s): string => s.user?.name || s.user?.username || '',
  },

  actions: {
    /** 写入登录态（账号登录 / 手机号登录 / 注册成功后共用） */
    applySession(result: { token: string; user: AuthUser }): void {
      this.token = result.token;
      this.user = result.user;
      setToken(result.token);
      storage.set('user', result.user);
    },

    async login(username: string, password: string): Promise<AuthUser> {
      this.loading = true;
      try {
        const result = await authApi.login(username, password);
        this.applySession(result);
        await this.syncProfile();
        return this.user ?? result.user;
      } finally {
        this.loading = false;
      }
    },

    /** 手机号 + 密码登录 */
    async loginByPhone(phone: string, password: string): Promise<AuthUser> {
      this.loading = true;
      try {
        const result = await authApi.loginByPhone(phone, password);
        this.applySession(result);
        await this.syncProfile();
        return this.user ?? result.user;
      } finally {
        this.loading = false;
      }
    },

    /** 手机号注册（成功后自动登录） */
    async registerByPhone(payload: PhoneRegisterPayload): Promise<AuthUser> {
      this.loading = true;
      try {
        const result = await authApi.registerByPhone(payload);
        this.applySession(result);
        await this.syncProfile();
        return this.user ?? result.user;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 同步完整用户资料（含任命岗位）。
     * 工作台按岗位显示入口，登录响应若缺岗位会导致「我的班级/班级聊天」等入口暂时消失，
     * 这里再拉一次 /auth/me 兜底；失败不阻塞登录，也不清登录态。
     */
    async syncProfile(): Promise<void> {
      try {
        const me = await authApi.me();
        this.user = { ...(this.user ?? {}), ...me } as AuthUser;
        storage.set('user', this.user);
      } catch {
        /* 忽略：已有登录态，下次刷新会重新同步 */
      }
    },

    logout(): void {
      this.token = '';
      this.user = null;
      clearToken();
    },

    /** 应用启动时校验本地登录态是否仍有效 */
    async restore(): Promise<boolean> {
      if (!this.token) return false;
      try {
        const me = await authApi.me();
        this.user = { ...this.user, ...me } as AuthUser;
        storage.set('user', this.user);
        return true;
      } catch {
        this.logout();
        return false;
      }
    },
  },
});