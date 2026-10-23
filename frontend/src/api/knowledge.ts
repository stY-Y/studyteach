import type { StudyStage, Subject } from '@teachstudy/shared';
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

/** 知识点树节点（GET /knowledge/tree 返回） */
export interface KnowledgeNode extends KnowledgePointItem {
  children: KnowledgeNode[];
}

export type CreateKnowledgeBody = {
  /** 编码可省略：留空由服务端按「学科-学段-序号」自动生成 */
  code?: string;
  name: string;
  subject: Subject;
  stage?: StudyStage;
  parentId?: string;
  description?: string;
  order?: number;
};

export const knowledgeApi = {
  /** 知识点列表（可按学科/学段过滤；公开接口，可离线缓存用于把 id 还原成名称） */
  list: (query?: { subject?: Subject; stage?: StudyStage }) =>
    http.get<KnowledgePointItem[]>('/knowledge', { query, cache: true }),

  /** 知识点树（教师端/管理端查看与维护） */
  tree: (subject?: Subject) =>
    http.get<KnowledgeNode[]>('/knowledge/tree', {
      query: subject ? { subject } : undefined,
      cache: true,
    }),

  /** 新增知识点（教师 / 管理员） */
  create: (body: CreateKnowledgeBody) => http.post<KnowledgePointItem>('/knowledge', body),
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
