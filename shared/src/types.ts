/**
 * @teachstudy/shared 通用类型
 */

/** 统一响应结构 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码（见 BizCode） */
  code: number;
  /** 提示信息 */
  message: string;
  /** 业务数据 */
  data: T;
  /** 服务器时间戳（毫秒） */
  timestamp: number;
}

/** 分页请求参数 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 知识点四维标注（题目/资源均关联知识点） */
export interface KnowledgeTag {
  knowledgePointId: string;
  knowledgePointName: string;
}

/** 通用主键类型（字符串 UUID） */
export type Id = string;