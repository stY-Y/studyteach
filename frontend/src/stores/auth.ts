import { defineStore } from 'pinia';
import { authApi, type AuthUser } from '../api/auth';
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
    async login(username: string, password: string): Promise<AuthUser> {
      this.loading = true;
      try {
        const result = await authApi.login(username, password);
        this.token = result.token;
        this.user = result.user;
        setToken(result.token);
        storage.set('user', result.user);
        return result.user;
      } finally {
        this.loading = false;
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