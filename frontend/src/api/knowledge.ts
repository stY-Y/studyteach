import type { Subject } from '@teachstudy/shared';
import { http } from './http';

export interface KnowledgePointItem {
  id: string;
  code: string;
  name: string;
  subject: Subject;
  stage?: string | null;
  parentId?: string | null;
  description?: string | null;
  order: number;
}

export const knowledgeApi = {
  /** 知识点列表（公开接口，可离线缓存用于把 id 还原成名称） */
  list: () => http.get<KnowledgePointItem[]>('/knowledge', { cache: true }),
};

/** 由知识点列表构建 id → 名称 的映射 */
export function buildNameMap(list: KnowledgePointItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  list.forEach((kp) => {
    map[kp.id] = kp.name;
    // 兼容后端可能返回 code 的情况
    map[kp.code] = kp.name;
  });
  return map;
}