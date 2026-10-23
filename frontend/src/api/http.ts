import { offline, isOnline } from '../utils/offline';
import { storage } from '../utils/storage';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api/v1';
const TOKEN_KEY = 'token';

/** 供文件上传/下载等需要自定义 fetch 的场景复用 */
export const API_BASE_URL = API_BASE;

/** 后端统一响应结构（与 @teachstudy/shared 的 ApiResponse 一致） */
interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 业务异常：带后端返回的 code，便于界面区分处理 */
export class ApiError extends Error {
  readonly code: number;
  readonly status: number;

  constructor(message: string, code: number, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string {
  return storage.get<string>(TOKEN_KEY) ?? '';
}

export function setToken(token: string): void {
  storage.set(TOKEN_KEY, token);
}

export function clearToken(): void {
  storage.remove(TOKEN_KEY);
  storage.remove('user');
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** 为 true 时把 GET 结果缓存到本地，断网可回退缓存 */
  cache?: boolean;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const parts: string[] = [];
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  return parts.length ? `${url}?${parts.join('&')}` : url;
}

/**
 * 统一请求层：
 *  - 自动附带 JWT
 *  - 自动解包后端统一响应 { code, message, data }
 *  - 401 自动清理登录态
 *  - 支持离线回退（cache: true 的 GET 请求）
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, cache = false, timeoutMs = 15000 } = options;
  const url = buildUrl(path, query);
  const cacheKey = `${method} ${url}`;

  // 已断网且允许缓存：直接读本地
  if (method === 'GET' && cache && !isOnline.value) {
    const cached = offline.load<T>(cacheKey);
    if (cached !== null) return cached;
    throw new ApiError('当前处于离线状态，且本地没有缓存数据', -1, 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getToken();

  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    let payload: ApiEnvelope<T> | null = null;
    try {
      payload = (await resp.json()) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }

    // 401 有两种来源：令牌失效，以及登录失败（账号或密码错误，后端同样返回 401）。
    // 因此优先透出后端的具体提示，否则用户在登录页输错密码会看到误导性的「登录已过期」。
    if (resp.status === 401) {
      clearToken();
      throw new ApiError(
        payload?.message || '登录已过期，请重新登录',
        typeof payload?.code === 'number' ? payload.code : 40100,
        401,
      );
    }

    if (!payload || typeof payload.code !== 'number') {
      throw new ApiError(`服务异常（HTTP ${resp.status}）`, -2, resp.status);
    }

    if (payload.code !== 0) {
      throw new ApiError(payload.message || '请求失败', payload.code, resp.status);
    }

    if (method === 'GET' && cache) {
      offline.save(cacheKey, payload.data);
    }
    return payload.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // 网络层失败：允许缓存的 GET 回退到本地
    if (method === 'GET' && cache) {
      const cached = offline.load<T>(cacheKey);
      if (cached !== null) return cached;
    }

    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络后重试', -3, 0);
    }
    throw new ApiError('网络连接失败，请检查网络后重试', -3, 0);
  } finally {
    clearTimeout(timer);
  }
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  /** DELETE 支持可选 body（如注销账号需二次确认密码） */
  del: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
};