import type {
  ResourceScope,
  ResourceStatus,
  ResourceType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { API_BASE_URL, getToken, http } from './http';

export interface ResourceItem {
  id: string;
  title: string;
  type: ResourceType;
  subject: Subject;
  stage: StudyStage;
  /** 年级：1-6 小学、7-9 初中、10-12 高中；null 表示跨年级通用 */
  grade?: number | null;
  knowledgePoints: string[];
  /** 字节 */
  fileSize: number;
  format: string;
  ownerId: string;
  schoolId?: string | null;
  scope: ResourceScope;
  status: ResourceStatus;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceListResult {
  list: ResourceItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type ResourceQuery = {
  type?: ResourceType;
  subject?: Subject;
  stage?: StudyStage;
  /** 年级；指定时会包含跨年级通用资源（后端已处理） */
  grade?: number;
};

export interface OfflineManifest {
  userId: string;
  count: number;
  items: Array<{ resourceId: string; cachedAt: number }>;
  generatedAt: number;
}

/* ---------- 需要自定义 fetch 的场景（multipart / 文件流） ---------- */

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 上传资源：multipart/form-data，浏览器自动带 boundary */
export async function uploadResource(form: FormData): Promise<ResourceItem> {
  const resp = await fetch(`${API_BASE_URL}/resources/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const payload = (await resp.json().catch(() => null)) as
    | { code: number; message: string; data: ResourceItem }
    | null;
  if (!payload) throw new Error(`上传失败（HTTP ${resp.status}）`);
  if (payload.code !== 0) throw new Error(payload.message || '上传失败');
  return payload.data;
}

/** 下载资源：全程免费，带 JWT 取文件流后触发保存 */
export async function downloadResource(id: string, filename?: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/resources/${id}/download`, {
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error('下载失败，请检查网络后重试');
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || '教学资源';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** 在线预览资源：带 JWT 取回文件本体（不计下载量） */
export async function fetchResourcePreview(id: string): Promise<{ blob: Blob; mime: string }> {
  const resp = await fetch(`${API_BASE_URL}/resources/${id}/preview`, {
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(resp.status === 404 ? '资源不存在或已下架' : '预览加载失败，请稍后重试');
  }
  const mime = resp.headers.get('content-type') || '';
  const blob = await resp.blob();
  // 个别代理会丢掉 charset，这里补上便于文本正确解码
  const typed = blob.type ? blob : blob.slice(0, blob.size, mime || 'application/octet-stream');
  return { blob: typed, mime: typed.type || mime };
}

export const resourcesApi = {
  /** 资源列表（仅审核通过、按开放权限过滤），可离线缓存 */
  list: (query: ResourceQuery, page = 1, pageSize = 12) =>
    http.get<ResourceListResult>('/resources', {
      query: { ...query, page, pageSize },
      cache: true,
    }),

  /** 教师/管理员：我的上传资源 */
  mine: () => http.get<ResourceItem[]>('/resources/mine', { cache: true }),

  /** 教师/管理员：上传资源（进入校级审核） */
  upload: uploadResource,

  /** 教师/管理员：修改标题或开放范围 */
  update: (id: string, body: { title?: string; scope?: ResourceScope }) =>
    http.patch<ResourceItem>(`/resources/${id}`, body),

  /** 教师/管理员：下架资源 */
  offline: (id: string) => http.post<ResourceItem>(`/resources/${id}/offline`),

  /** 下载资源 */
  download: downloadResource,

  /** 在线预览（点开即看，不下载） */
  preview: fetchResourcePreview,

  /** 离线缓存清单 */
  manifest: () => http.get<OfflineManifest>('/resources/offline/manifest'),

  /** 加入离线缓存 / 删除缓存 */
  cacheOffline: (id: string) =>
    http.post<{ cached: boolean }>(`/resources/offline/cache/${id}`),
  releaseOffline: (id: string) =>
    http.del<{ released: boolean }>(`/resources/offline/cache/${id}`),
};
